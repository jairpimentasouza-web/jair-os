// Desenha as ligações do mapa mental (centro -> cada ramo) depois do layout.
function drawMindmaps() {
  document.querySelectorAll('.mindmap').forEach(function (map) {
    var old = map.querySelector('svg.links');
    if (old) old.remove();
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'links');
    map.prepend(svg);
    var box = map.getBoundingClientRect();
    var c = map.querySelector('.mm-center').getBoundingClientRect();
    var cx = c.left + c.width / 2 - box.left;
    var cy = c.top + c.height / 2 - box.top;
    map.querySelectorAll('.mm-node').forEach(function (node) {
      var r = node.getBoundingClientRect();
      var nx = r.left + r.width / 2 - box.left;
      var ny = r.top + r.height / 2 - box.top;
      // ponto de chegada: borda do cartão mais próxima do centro
      var tx = nx, ty = ny;
      if (Math.abs(nx - cx) > r.width / 2) tx = nx > cx ? r.left - box.left : r.right - box.left;
      else ty = ny > cy ? r.top - box.top : r.bottom - box.top;
      var mx = (cx + tx) / 2;
      var path = document.createElementNS(NS, 'path');
      var d = Math.abs(nx - cx) > r.width / 2
        ? 'M' + cx + ',' + cy + ' C' + mx + ',' + cy + ' ' + mx + ',' + ty + ' ' + tx + ',' + ty
        : 'M' + cx + ',' + cy + ' L' + tx + ',' + ty;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', getComputedStyle(node).getPropertyValue('--c') || '#4a4c55');
      path.setAttribute('stroke-width', '2.4');
      path.setAttribute('stroke-linecap', 'round');
      svg.appendChild(path);
      var dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('cx', tx); dot.setAttribute('cy', ty); dot.setAttribute('r', 3.2);
      dot.setAttribute('fill', getComputedStyle(node).getPropertyValue('--c') || '#4a4c55');
      svg.appendChild(dot);
    });
  });
}
window.addEventListener('load', drawMindmaps);
window.addEventListener('resize', drawMindmaps);
window.addEventListener('beforeprint', drawMindmaps);
